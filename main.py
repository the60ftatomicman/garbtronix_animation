# ---------- References
# --- https://stackoverflow.com/questions/38153754/can-you-fit-multiple-buttons-in-one-grid-cell-in-tkinter
# --- https://bytes.com/topic/python/answers/935717-tkinter-text-widget-check-if-text-edited
# ---------- Imports
# ----- Internal Libs
from os import scandir,mkdir,remove,path
from datetime import datetime
from re import compile, match
from math import floor
import tkinter as tk
import copy
# ----- External Libs
from PIL import Image,ImageTk,ImageDraw,ImageFont # Since Python 3, need to use external Pillow
from cv2 import VideoWriter,VideoWriter_fourcc
from numpy import array as numpy_array

# ---------- TODOS
# TODO: Add controls for font selection and size
# TODO: Add control for selecting an input file other than example.txt
# TODO: Port code for ingesting programmatic pre-compiled scripts from JS
# TODO: As part of the programmatic pre-compiled scripts it'd be REALLY nice to give a "translucent" character
#       to ease headaches in building programmatic code
# TODO: Investigate adding sound?

# Have to put this here because of blnRunLoop
window = tk.Tk()
window.title("Garbtronix Animation Compiler")
# ---------- Initialize
dirRoot = path.dirname(path.realpath(__file__))
strPostFile    = dirRoot+"/post-compile.txt"
strPreFile     = dirRoot+"/pre-compile.txt"
dirScratch     = dirRoot+"/scratch"
blnScanningDir = False
blnSavingGif   = False
blnRunLoop     = tk.IntVar()
#
blnCaptureLine     = False
regexFrameEnd      = compile('^(\*\*)$')
regexFrameStart    = compile('^(\*)$')
regexHasFrameCount = compile('^0,[0-9]{1,}$')
idxFrame           = -1
lstFrames          = []   # Text representation of the frames
idxDrawing         = 0
lstDrawing         = None # Image representation of the frames
intMaxChars_Width  = 0
intMaxChars_Height = 0
#
time_LastModified  = 0
# ---------- Compile Components 
renderFont = ImageFont.truetype(dirRoot+"/fonts/lucon.ttf",encoding='unic',size=14)
#renderFont = ImageFont.truetype(dirRoot+"/fonts/FreeMono.ttf",encoding='unic',size=14)
#renderFont = ImageFont.truetype(dirRoot+"/fonts/DroidSansMono.ttf",encoding='unic',size=14)
#renderFont = ImageFont.truetype(dirRoot+"/fonts/jgs_Font.ttf",encoding='unic',size=14)

# ----- Header
frmControls  = tk.Frame(window)
frmTextboxes = tk.Frame(frmControls)
frmButtons   = tk.Frame(frmControls)
# - Run Loop Checkbox
chkRunLoop = tk.Checkbutton(frmControls, text='Run Loop',variable=blnRunLoop, onvalue=1, offvalue=0)
chkRunLoop.grid(row=0, column=0)
# - Width Control
tkWidth  = tk.StringVar()
lblWidth = tk.Label(frmTextboxes,text="W:")
lblWidth.grid(row=0, column=0)
txtWidth = tk.Entry(frmTextboxes,width=5,textvariable=tkWidth)
txtWidth.grid(row=0, column=1)

# - Height Control
tkHeight  = tk.StringVar()
tkHeight.set("")
lblHeight = tk.Label(frmTextboxes,text="H:")
lblHeight.grid(row=0, column=2)
txtHeight = tk.Entry(frmTextboxes,width=5,textvariable=tkHeight)
txtHeight.grid(row=0, column=3)
#tkHeight.trace("w", text_changed)

# - FPS (Speed) Control
lblFPS = tk.Label(frmTextboxes,text="FPS")
lblFPS.grid(row=0, column=4)
txtFPS = tk.Spinbox(frmTextboxes,width=5,values=[24,18,15,12,6,1,0.5,0.25,0.1])
txtFPS.grid(row=0, column=5)

# - Resize Button
btnResize = tk.Button(frmButtons, text='Resize')
btnResize.grid(row=0, column=0,padx=2)
# - Previous Button
btnPrevious = tk.Button(frmButtons, text='Previous')
btnPrevious.grid(row=0, column=1,padx=2)
# - Next Button
btnNext = tk.Button(frmButtons, text='Next')
btnNext.grid(row=0, column=2,padx=2)
# - Save Button
btnSave = tk.Button(frmButtons, text='Save')
btnSave.grid(row=0, column=3,padx=2)
# - Save Button
btnCompile = tk.Button(frmButtons, text='Compile')
btnCompile.grid(row=0, column=4,padx=2)

# - Img
picDrawing = tk.Label(frmControls, width=512, height=512)
picDrawing.grid(row=0, column=1,columnspan=2)

# -- build it all together
frmControls.grid(row=0,column=0)
frmTextboxes.grid(row=1,column=0)
frmButtons.grid(row=2,column=0)

# ---------- Methods

### Sees if the animation file (example.txt) was updated based on 
### the last modified time.
def checkAnimationFileUpdates():
    global time_LastModified
    time_currentModified = path.getmtime(strPostFile)
    print("[%d] ? [%d] " %(time_currentModified,time_LastModified))
    if(time_currentModified > time_LastModified):
        time_LastModified = time_currentModified
        return True
    else:
        return False

### The magic! this parses our post-compiled .txt files.
### The file is parsed and our lstFrames array is populated with text.
### This will not run if we are scanning OR saving.
def parsePostCompileFile():
    global blnCaptureLine,regexFrameEnd,regexFrameStart,idxFrame,lstFrames,time_LastModified
    if (blnScanningDir == False and blnSavingGif == False):
        lstFrames=[]
        idxFrame=-1
        blnCopieCountLine=True
        intCopies=0
        time_LastModified = path.getmtime(strPostFile)
        with open(strPostFile, mode='r',encoding='utf-8') as fileData:
            lines = fileData.readlines()  # list containing lines of file
            for line in lines:
                if line:
                    if(blnCopieCountLine):
                        #if(regexHasFrameCount.match(line)):
                        intCopies = int(line.split(',')[1])
                        blnCopieCountLine=False
                    if(regexFrameEnd.match(line)):
                        blnCaptureLine = False
                        blnCopieCountLine = True
                        for copy in range(intCopies):
                            if copy > 0:
                                lstFrames.append([])
                                lstFrames[idxFrame+copy] = lstFrames[idxFrame]
                        idxFrame=len(lstFrames)-1
                        intCopies=1 
                    if(blnCaptureLine):
                        #print(line)
                        lstFrames[idxFrame].append(line)
                    if(regexFrameStart.match(line)):
                        blnCaptureLine = True
                        idxFrame      += 1
                        lstFrames.append([])

### The magic! this parses our post-compiled .txt files.
### The file is parsed and our lstFrames array is populated with text.
### This will not run if we are scanning OR saving.
def parsePreCompileFile():
    global blnScanningDir,blnSavingGif,blnRunLoop
    blnObjectSection=False
    blnObjectIndex=False
    blnSceneSection=False
    blnSceneStandardCommands=False
    blnSceneRepeatCommands=False
    blnSceneModifiedCommands=False
    strCurrentObject=""
    regexObjectSection=compile('^(\*\*\*\*) Objects$')
    regexObjectName=compile('^[a-zA-Z0-9]{1,}')
    regexObjectStart=compile('^(\*)$')
    regexObjectIdx=compile('^(\*\*) [0-9]$')
    regexObjectEnd=compile('^(\*\*\*) E$')
    
    regexSceneSection=compile('^(\*\*\*\*) Scene$')
    regexSceneStandardStart=compile('^(\*) [0-9]$')
    regexSceneRepeatStart=compile('^(\*) R [0-9]')
    regexSceneModifiedStart=compile('^(\*) M [0-9]')
    regexSceneModifiedCommand=compile('^(\*\*) [0-9,]{1,}')
    regexSceneObject=compile('^(\*\*) [a-zA-Z]{1,}')
    regexSceneEnd=compile('^(\*\*\*) E$')
    
    lstObjects={}
    lstScenes={}
    lstLastSceneCommands=[]
    lstModifiedCommands=[]
    
    if (blnScanningDir == False and blnSavingGif == False and blnRunLoop.get() != 1):
        with open(strPreFile, mode='r',encoding='utf-8') as fileData:
            lines = fileData.readlines()  # list containing lines of file
            for line in lines:
                if line:
                    # Object Parsing
                    if(blnObjectSection):
                        if(blnObjectIndex):
                            if(regexObjectEnd.match(line)):
                                blnObjectIndex=False
                            elif(regexObjectIdx.match(line)):
                                latestIdx=len(lstObjects[strCurrentObject])
                                lstObjects[strCurrentObject][latestIdx]=[]
                            else:
                                latestIdx=len(lstObjects[strCurrentObject])-1
                                lstObjects[strCurrentObject][latestIdx].append(line.replace('\n', '').replace('\r', ''))
                        else:
                            if(regexObjectStart.match(line)):
                                blnObjectIndex=True
                            if(regexObjectName.match(line)):
                                strCurrentObject=line.strip()
                                lstObjects[strCurrentObject]={}
                    # Scene Parsing
                    if(blnSceneSection):
                        latestIdx=len(lstScenes)
                        if(blnSceneStandardCommands == True):
                            latestIdx=latestIdx-1
                            if(regexSceneEnd.match(line)):
                                blnSceneStandardCommands=False
                                lstScenes[latestIdx].append(list("**"))
                            if(regexSceneObject.match(line)):
                                lstLastSceneCommands.append(line)
                                cmdData = line.replace("** ","").split(',')
                                if cmdData[0] in lstObjects:
                                    if(int(cmdData[1]) in lstObjects[cmdData[0]]):
                                        cy=0
                                        for lne in lstObjects[cmdData[0]][int(cmdData[1])]:
                                            lneData=list(lne)
                                            y=int(cmdData[3])+cy
                                            if  y >= 0:
                                                y=y+2 # the 2 is our prefece for header info
                                                cx=0
                                                for chr in lneData:
                                                    x=int(cmdData[2])+cx
                                                    # Pad Y values
                                                    if y >= 0 and y not in lstScenes[latestIdx]:
                                                        while(len(lstScenes[latestIdx]) < y+1):
                                                            lstScenes[latestIdx].append([])
                                                    # Pad X values
                                                    if x >= 0 and x not in lstScenes[latestIdx][y]:
                                                        while(len(lstScenes[latestIdx][y]) < x+1):
                                                            lstScenes[latestIdx][y].append(' ')
                                                    if x >= 0:
                                                        lstScenes[latestIdx][y][x]=chr
                                                    cx=cx+1
                                            cy=cy+1
                                    else:
                                       print("Could not find Index: "+str(cmdData[1])+" in Object: "+cmdData[0]) 
                                else:
                                    print("Could not find Object: "+cmdData[0])
                        elif(blnSceneRepeatCommands == True):
                            blnSceneRepeatCommands=False
                        elif(blnSceneModifiedCommands == True):
                            if(regexSceneEnd.match(line)):
                                blnSceneModifiedCommands=False
                                latestIdx=latestIdx+1
                                lstScenes[latestIdx]=[]
                                for cmd in lstLastSceneCommands:
                                    cmdData = cmd.replace("** ","").split(',')
                                    if cmdData[0] in lstObjects:
                                        if(int(cmdData[1]) in lstObjects[cmdData[0]]):
                                            cy=0
                                            for lne in lstObjects[cmdData[0]][int(cmdData[1])]:
                                                lneData=list(lne)
                                                y=int(cmdData[3])+cy
                                                if  y >= 0:
                                                    y=y+2 # the 2 is our prefece for header info
                                                    cx=0
                                                    for chr in lneData:
                                                        x=int(cmdData[2])+cx
                                                        # Pad Y values
                                                        if y >= 0 and y not in lstScenes[latestIdx]:
                                                            while(len(lstScenes[latestIdx]) < y+1):
                                                                lstScenes[latestIdx].append([])
                                                        # Pad X values
                                                        if x >= 0 and x not in lstScenes[latestIdx][y]:
                                                            while(len(lstScenes[latestIdx][y]) < x+1):
                                                                lstScenes[latestIdx][y].append(' ')
                                                        if x >= 0:
                                                            lstScenes[latestIdx][y][x]=chr
                                                        cx=cx+1
                                                cy=cy+1
                                        else:
                                            print("Could not find Index: "+str(cmdData[1])+" in Object: "+cmdData[0]) 
                                    else:
                                        print("Could not find Object: "+cmdData[0])
                            if(regexSceneModifiedCommand.match(line)):
                                cmdData = line.replace("** ","").replace('\n', '').replace('\r', '').split(",")
                                lstModifiedCommands.append(cmdData)
                                cmdIdx  = int(cmdData[0])
                                drawIdx = cmdData[1]
                                xDiff = 0
                                if len(cmdData) > 2:
                                    xDiff = int(cmdData[2])
                                yDiff = 0
                                if len(cmdData) > 3:
                                    yDiff = int(cmdData[3])
                                newCommand = lstLastSceneCommands[cmdIdx]
                                newCommand = newCommand.replace('\n', '').replace('\r', '').split(",")
                                newCommand[1]=drawIdx
                                newCommand[2]=str(int(newCommand[2])+xDiff)
                                newCommand[3]=str(int(newCommand[3])+yDiff)
                                lstLastSceneCommands[cmdIdx] = ",".join(newCommand)+'\n'
                        else:
                            if(regexSceneStandardStart.match(line)):
                                blnSceneStandardCommands=True
                                lstLastSceneCommands=[]
                                framecount=line.split()[1]
                                lstScenes[latestIdx]=[]
                                lstScenes[latestIdx].append(list(str(latestIdx)+","+framecount))
                                lstScenes[latestIdx].append(list("*"))
                            if(regexSceneRepeatStart.match(line)):
                                # TODO -- add in C modifier again!
                                repeatData = line.replace("* R ","")
                                startEnd   = repeatData.split(" ")[0]
                                loopData   = int(repeatData.split(" L ")[1])
                                loops = 0
                                while loops < loopData:
                                    start=int(startEnd.split(',')[0])
                                    end=int(startEnd.split(',')[1])
                                    current=0
                                    while (start+current)<=end:
                                        copyScene=copy.deepcopy(lstScenes[start+current])
                                        latestIdx=len(lstScenes)+1
                                        lstScenes[latestIdx]=copyScene
                                        lstScenes[latestIdx][0][0]=str(latestIdx)
                                        current+=1
                                    loops+=1
                                blnSceneRepeatCommands=True
                            if(regexSceneModifiedStart.match(line)):
                                blnSceneModifiedCommands=True
                                lstModifiedCommands=[]
                    # -- Section Determination Booleans
                    if(regexObjectSection.match(line)):
                        blnObjectSection = True
                        blnSceneSection  = False
                    if(regexSceneSection.match(line)):
                        blnObjectSection = False
                        blnSceneSection  = True
    # Write post-compile file
    with open(strPostFile+".new", mode='w',encoding='utf-8') as fileData:
        for scene in lstScenes:
            for line in lstScenes[scene]:
                fileData.write(''.join(line)+"\n")
    print("Done Compiling")

### Loops through the lstFrames array and gets the largest height and width
### for the images. We set width and height text value based on this.
def getWidthAndHeight():
    global lstFrames,intMaxChars_Width,intMaxChars_Height,tkWidth,tkHeight
    intMaxChars_Height = 0
    intMaxChars_Width = 0
    for frame in lstFrames:
        intMaxChars_Height = len(frame) if len(frame) > intMaxChars_Height else intMaxChars_Height
        for line in frame:
            intMaxChars_Width = len(line) if len(line) > intMaxChars_Width else intMaxChars_Width

    intMaxChars_Height *= renderFont.font.height
    intMaxChars_Width  *= floor(renderFont.font.height/2)+1#renderFont.font.getsize("A")[0][0]-1
    #
    tkWidth.set(str(intMaxChars_Width))
    #
    tkHeight.set(str(intMaxChars_Height))

### gather every image in the scratch dir and 
### put the values into the lstDrawing array.
def updateFileLists():
    global lstDrawing,blnSavingGif,blnScanningDir
    if (blnSavingGif == False):
        blnScanningDir = True
        lstDrawing = None # hopefully clears memory better
        lstDrawing = []
        for entry in scandir(dirScratch):
            if (entry.path.endswith(".jpg")
                or entry.path.endswith(".png")) and entry.is_file():
                print("Found Frame: [%s]" % (entry.path))
                frameNum = int(entry.name[5:entry.name.find(".png")])
                if(len(lstDrawing) < frameNum):
                    lstDrawing = lstDrawing + [None] * (frameNum-len(lstDrawing))
                lstDrawing[frameNum-1] = entry.path
        lstDrawing = list(filter((None).__ne__, lstDrawing))

        blnScanningDir = False
        print("Frame Count: [%d]" % (len(lstDrawing)))
    else:
        print("Could not load list, currently saving")
    #
    #window.after(10000, updateFileLists)

### Given an index (idxDrawing, idxFrames) 
### and their respective list Update by the diff.
### updating to first or last if necessary
def updateIndex(idx,lst,diff):
    newIdx = idx+diff
    if diff > 0 and newIdx >= len(lst):
        newIdx = 0
    if(diff < 0 and  newIdx < 0):
        newIdx = len(lst)-1
    print("Index was: %d is now: %d" % (idx,newIdx))
    return newIdx

### Update the actual widget which shows the image.
def updateImages(picDraw):
    global idxDrawing,lstDrawing

    print("Getting Frame Image [%d] [%s]" % (idxDrawing,lstDrawing[idxDrawing]))
    imgDraw = ImageTk.PhotoImage(
        Image.open(lstDrawing[idxDrawing])
    )
    picDraw.configure(image=imgDraw)
    picDraw.image=imgDraw

### Event for button to update IDX and redraw image
def stepImageForward():
    global idxDrawing,lstDrawing
    global picDrawing
    idxDrawing = updateIndex(idxDrawing, lstDrawing, 1)
    updateImages(picDrawing)

### Event for button to update IDX and redraw image
def stepImageBack():
    global idxDrawing,lstDrawing
    global picDrawing
    idxDrawing = updateIndex(idxDrawing, lstDrawing, -1)
    updateImages(picDrawing)

### For each image in lstDrawing, 
### compile and create a GIF in the root dir
def saveGif():
    global lstDrawing,idxReference,blnSavingGif
    images = []
    if (blnScanningDir == False):
        blnSavingGif=True
        for frameImg in lstDrawing:
            images.append(Image.open(frameImg))
        filename = str(datetime.now()).replace(".", "-").replace(":", "-").replace(" ", "_")
        duration  = int(1000/float(txtFPS.get()))
        images[0].save(dirRoot + filename + '.gif', format='GIF', append_images=images[1:], save_all=True,duration=([duration] * len(images)), loop=0)
        saveMp4(filename,images,images[0].width,images[0].height,int(txtFPS.get()))
        blnSavingGif = False
    else:
        print("Cannot save, currently scanning")

### For each image in lstDrawing, 
### compile and create a MP4 in the root dir
def saveMp4(filename,images,width,height,fps):
    out = VideoWriter(dirRoot+filename+'.mp4',VideoWriter_fourcc(*'MP4V'), fps, (width,height))
    for i in range(len(images)):
        out.write(numpy_array(images[i]))
    out.release()

### Loop for updating the picture widget
### or kicking off a scan. Main loop really.
def updateLoop():
    global picDrawing
    global blnScanningDir
    global blnRunLoop
    nextLoop = 1000
    if(blnScanningDir == False):
        if(blnRunLoop.get() == 1):
            updateImages(picDrawing)
            stepImageForward()
            nextLoop = int(1000/float(txtFPS.get()))
            print("Next frame in: [%d] ms" % (nextLoop))
        else:
            print("Waiting 5 to see to scan [%d] " % (blnRunLoop.get()))
            nextLoop = 5000
            if (checkAnimationFileUpdates()):
                print("Animation File Updated, time to redo!")
                parsePostCompileFile()
                getWidthAndHeight()
                createFrameImgs()
                updateFileLists()
                updateImages(picDrawing)
    else:
        print("Be paitent, scanning dirs for more images")

    window.after(nextLoop, updateLoop)

### Write out the frame pngs to the scratch folder
def createFrameImgs():
    global blnScanningDir,renderFont,txtHeight,txtWidth
    blnScanningDir = True
    try:
        mkdir(dirScratch)
    except FileExistsError:
        print("Directory already exist, cleaning it!")
        for filename in scandir(dirScratch):
            remove(filename)
    i = 0
    for frame in lstFrames:
        renderImg = Image.new('RGB', (int(txtWidth.get()), int(txtHeight.get())), color=(255, 255, 255))
        y = 0
        for line in frame:
            ImageDraw.Draw(renderImg).text((0, y*renderFont.font.height),line, fill=(0, 0, 0),font=renderFont)
            y += 1
        i+=1
        renderImg.save(dirScratch + '/Frame' + str(i)+ '.png', format='PNG')
    blnScanningDir = False

### Event for resizing images.
def resizeImgs():
    createFrameImgs()
    stepImageForward()
    stepImageBack()

# ---------- Main
if __name__ == '__main__':
    # have to set these AFTER we initalize
    btnResize.configure(command=resizeImgs)
    btnNext.configure(command=stepImageForward)
    btnPrevious.configure(command=stepImageBack)
    btnSave.configure(command=saveGif)
    btnCompile.configure(command=parsePreCompileFile)

    parsePostCompileFile()
    getWidthAndHeight()
    createFrameImgs()

    updateFileLists()
    updateImages(picDrawing)
    window.after(0, updateLoop)
    window.mainloop()




